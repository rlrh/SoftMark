import { validate } from "class-validator";
import { Request, Response } from "express";
import { pick } from "lodash";
import {
  createQueryBuilder,
  getManager,
  getRepository,
  IsNull,
  Not
} from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { PaperUser } from "../entities/PaperUser";
import { Script } from "../entities/Script";
import { User } from "../entities/User";
import {
  NominalRollPostData,
  PaperUserPostData,
  PaperUserRole
} from "../types/paperUsers";
import {
  AccessTokenSignedPayload,
  InviteTokenSignedPayload
} from "../types/tokens";
import { allowedRequester, allowedRequesterOrFail } from "../utils/papers";
import { sendInviteEmail } from "../utils/sendgrid";
import { sortPaperUserByName } from "../utils/sorts";

export async function create(request: Request, response: Response) {
  try {
    const payload = response.locals.payload as AccessTokenSignedPayload;
    const paperId = request.params.id;
    const allowed = await allowedRequester(
      payload.userId,
      paperId,
      PaperUserRole.Owner
    );
    if (!allowed) {
      return response.sendStatus(404);
    }
    const { paper } = allowed;
    const {
      email,
      role,
      matriculationNumber,
      name
    } = request.body as PaperUserPostData;

    const user =
      (await getRepository(User).findOne({ email, discardedAt: IsNull() })) ||
      new User(email, undefined, name);
    const paperUser =
      (await getRepository(PaperUser).findOne(
        {
          user,
          role,
          discardedAt: Not(IsNull())
        },
        { relations: ["user", "paper"] }
      )) || new PaperUser(paper, user, role, false, matriculationNumber);

    const userErrors = await validate(user);
    if (userErrors.length > 0) {
      return response.sendStatus(400);
    }

    paperUser.matriculationNumber = matriculationNumber || null;
    paperUser.discardedAt = null;
    paperUser.acceptedInvite = false;
    const errors = await validate(paperUser);
    if (errors.length > 0) {
      return response.sendStatus(400);
    }
    //TODO: need to add uniqueness check to students

    await getManager().transaction(async manager => {
      await getRepository(User).save(user);
      await getRepository(PaperUser).save(paperUser);
    });

    const data = await paperUser.getData();

    if (role === PaperUserRole.Marker) {
      sendInviteEmail(paperUser, "7d");
    }

    return response.status(201).json({ paperUser: data });
  } catch (error) {
    return response.sendStatus(400);
  }
}

export async function getMarkers(request: Request, response: Response) {
  try {
    const payload = response.locals.payload as AccessTokenSignedPayload;
    const paperId = Number(request.params.id);
    await allowedRequesterOrFail(payload.userId, paperId, PaperUserRole.Marker);

    const markers = await getRepository(PaperUser)
      .createQueryBuilder("paperUser")
      .where("paperUser.paperId = :id", { id: paperId })
      .andWhere("paperUser.role IN (:...roles)", {
        roles: [PaperUserRole.Marker, PaperUserRole.Owner]
      })
      .andWhere("paperUser.discardedAt is null")
      .getMany();

    const data = (await Promise.all(
      markers.map(async (marker: PaperUser) => await marker.getListData())
    )).sort(sortPaperUserByName);
    return response.status(200).json({ paperUsers: data });
  } catch (error) {
    response.sendStatus(404);
  }
}

export async function update(request: Request, response: Response) {
  const payload = response.locals.payload as AccessTokenSignedPayload;
  const requesterId = payload.userId;
  const paperUserId = request.params.id;
  const paperUser = await getRepository(PaperUser).findOne(paperUserId, {
    where: { discardedAt: IsNull() }
  });
  if (!paperUser) {
    response.sendStatus(404);
    return;
  }
  const allowed = await allowedRequester(
    requesterId,
    paperUser.paperId,
    PaperUserRole.Owner
  );
  if (!allowed) {
    response.sendStatus(404);
    return;
  }

  Object.assign(paperUser, pick(request.body, "role", "matriculationNumber"));
  if (paperUser.matriculationNumber) {
    paperUser.matriculationNumber = paperUser.matriculationNumber.toUpperCase();
  }
  const errors = await validate(paperUser);
  if (errors.length > 0) {
    response.sendStatus(400);
    return;
  }
  await getRepository(PaperUser).save(paperUser);

  const data = await paperUser.getData();
  response.status(201).json({ paperUser: data });
}

export async function updateStudent(request: Request, response: Response) {
  const payload = response.locals.payload as AccessTokenSignedPayload;
  const requesterId = payload.userId;
  const studentId = request.params.id;
  const student = await getRepository(PaperUser).findOne(studentId, {
    where: { role: PaperUserRole.Student, discardedAt: IsNull() }
  });
  if (!student) {
    response.sendStatus(404);
    return;
  }
  const allowed = await allowedRequester(
    requesterId,
    student.paperId,
    PaperUserRole.Owner
  );
  if (!allowed) {
    response.sendStatus(404);
    return;
  }

  const user = await getRepository(User).findOne(student.userId);
  if (!user) {
    return response.sendStatus(400);
  }
  Object.assign(user, pick(request.body, "name", "email"));
  const userErrors = await validate(user);
  if (userErrors.length > 0) {
    return response.sendStatus(400);
  }

  Object.assign(student, pick(request.body, "matriculationNumber"));
  student.user = user;
  const errors = await validate(student);
  if (errors.length > 0) {
    response.sendStatus(400);
    return;
  }

  await getManager().transaction(async manager => {
    await getRepository(User).save(user);
    await getRepository(PaperUser).save(student);
  });

  const data = await student.getStudentData();
  response.status(201).json({ paperUser: data });
}

export async function discard(request: Request, response: Response) {
  try {
    const payload = response.locals.payload as AccessTokenSignedPayload;
    const userId = payload.userId;
    const paperUserId = Number(request.params.id);
    const paperUser = await getRepository(PaperUser).findOne(paperUserId, {
      where: { discardedAt: IsNull() }
    });
    if (!paperUser) {
      response.sendStatus(404);
      return;
    }
    const paperId = paperUser.paperId;
    const allowed = await allowedRequester(
      userId,
      paperId,
      PaperUserRole.Owner
    );
    if (!allowed) {
      response.sendStatus(404);
      return;
    }

    await getRepository(PaperUser).update(paperUserId, {
      discardedAt: new Date()
    });

    const scriptsWithStudent = await getRepository(Script).find({
      where: { paperId, studentId: paperUserId }
    });

    await Promise.all(
      scriptsWithStudent.map(async script => {
        await getRepository(Script).update(script.id, {
          studentId: null,
          hasVerifiedStudent: false
        });
      })
    );

    response.sendStatus(204);
  } catch (error) {
    response.sendStatus(400);
  }
}

export async function undiscard(request: Request, response: Response) {
  try {
    const payload = response.locals.payload as AccessTokenSignedPayload;
    const userId = payload.userId;
    const paperUserId = Number(request.params.id);
    const paperUser = await getRepository(PaperUser).findOne(paperUserId);
    if (!paperUser) {
      response.sendStatus(404);
      return;
    }
    const allowed = await allowedRequester(
      userId,
      paperUser.paperId,
      PaperUserRole.Owner
    );
    if (!allowed) {
      response.sendStatus(404);
      return;
    }

    await getRepository(PaperUser).update(paperUserId, { discardedAt: null });
    paperUser.discardedAt = null;

    const data = await paperUser.getData();
    response.status(200).json({ paperUser: data });
  } catch (error) {
    response.sendStatus(400);
  }
}

export async function checkInvite(request: Request, response: Response) {
  const payload = response.locals.payload as InviteTokenSignedPayload;
  const { paperUserId } = payload;

  const data = await getRepository(PaperUser)
    .createQueryBuilder("paperUser")
    .where("paperUser.id = :paperUserId", { paperUserId })
    .andWhere("paperUser.discardedAt IS NULL")
    .andWhere("paperUser.acceptedInvite = false")
    .innerJoin("paperUser.user", "user", "user.discardedAt IS NULL")
    .innerJoin("paperUser.paper", "paper", "paper.discardedAt IS NULL")
    .select("user.name", "userName")
    .addSelect("paper.name", "paperName")
    .getRawOne();

  if (!data) {
    response.sendStatus(404);
    return;
  }

  response.status(200).json({ invite: data });
}

export async function replyInvite(request: Request, response: Response) {
  const payload = response.locals.payload as InviteTokenSignedPayload;
  const { paperUserId } = payload;
  const {
    name,
    accepted
  }: { name: string | null; accepted: boolean } = request.body;

  const paperUser = await getRepository(PaperUser).findOne(paperUserId);
  if (!paperUser) {
    response.sendStatus(404);
    return;
  }

  let partial: QueryDeepPartialEntity<PaperUser>;
  if (accepted) {
    partial = { acceptedInvite: true };
  } else if (paperUser.role !== PaperUserRole.Student) {
    partial = { discardedAt: new Date() };
  } else {
    return;
  }

  await getRepository(PaperUser).update(paperUserId, partial);

  const user = await createQueryBuilder(User, "user")
    .innerJoin("user.paperUsers", "paperUser", "paperUser.id = :paperUserId", {
      paperUserId
    })
    .getOne();

  if (!user) {
    response.sendStatus(404);
    return;
  }

  if (name) {
    user.name = name;
    await getRepository(User).save(user);
  }

  const data = user.createAuthenticationTokens();
  response.status(200).json(data);
}

export async function discardStudents(request: Request, response: Response) {
  try {
    const payload = response.locals.payload as AccessTokenSignedPayload;
    const userId = payload.userId;
    const paperId = Number(request.params.id);
    const allowed = await allowedRequester(
      userId,
      paperId,
      PaperUserRole.Owner
    );
    if (!allowed) {
      return response.sendStatus(404);
    }

    const students = await getRepository(PaperUser).find({
      where: { paperId, role: PaperUserRole.Student, discardedAt: IsNull() }
    });

    const scriptsWithStudents = await getRepository(Script).find({
      where: { paperId, studentId: Not(IsNull()) }
    });

    await Promise.all(
      scriptsWithStudents.map(async script => {
        await getRepository(Script).update(script.id, {
          studentId: null,
          hasVerifiedStudent: false
        });
      })
    );

    await Promise.all(
      students.map(async student => {
        await getRepository(PaperUser).update(student.id, {
          discardedAt: new Date()
        });
      })
    );

    response.sendStatus(204);
  } catch (error) {
    response.sendStatus(400);
  }
}

export async function createMultipleStudents(
  request: Request,
  response: Response
) {
  try {
    const payload = response.locals.payload as AccessTokenSignedPayload;
    const paperId = request.params.id;
    const allowed = await allowedRequester(
      payload.userId,
      paperId,
      PaperUserRole.Owner
    );
    if (!allowed) {
      return response.sendStatus(404);
    }
    const { paper } = allowed;
    const { rows } = request.body as NominalRollPostData;
    let successfullyAdded = "";
    let failedToBeAdded = "";
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.length >= 3) {
        const matriculationNumber = row[0];
        const name = row[1];
        const email = row[2];
        const role = PaperUserRole.Student;
        const studentDetails = matriculationNumber + " " + name + " " + email;

        const user =
          (await getRepository(User).findOne({
            email,
            discardedAt: IsNull()
          })) || new User(email, undefined, name);
        const userErrors = await validate(user);

        const paperUser =
          (await getRepository(PaperUser).findOne(
            {
              user,
              role,
              discardedAt: Not(IsNull())
            },
            { relations: ["user", "paper"] }
          )) || new PaperUser(paper, user, role, false, matriculationNumber);

        paperUser.matriculationNumber = matriculationNumber || null;
        paperUser.discardedAt = null;
        paperUser.acceptedInvite = false;
        const paperUserErrors = await validate(paperUser);
        //this is not good practice for error handling, but it will do for now
        if (userErrors.length === 0 && paperUserErrors.length === 0) {
          try {
            await getManager().transaction(async manager => {
              await getRepository(User).save(user);
              await getRepository(PaperUser).save(paperUser);
            });
            successfullyAdded += studentDetails + "\n";
          } catch (error) {
            failedToBeAdded +=
              studentDetails + " (Error: Student has already been added)\n";
          }
        } else {
          if (userErrors.length > 0) {
            failedToBeAdded +=
              studentDetails + " (Error: " + userErrors[0] + ")\n";
          } else {
            failedToBeAdded +=
              studentDetails + " (Error: " + paperUserErrors[0] + ")\n";
          }
        }
      }
    }

    return response.status(200).json({
      successfullyAdded: successfullyAdded ? successfullyAdded : "None",
      failedToBeAdded: failedToBeAdded ? failedToBeAdded : "None"
    });
  } catch (error) {
    return response.sendStatus(400);
  }
}
