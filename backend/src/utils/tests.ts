import { hashSync } from "bcryptjs";
import supertest = require("supertest");
import { getRepository } from "typeorm";
import faker = require("faker");
faker.seed(127);

import { User } from "../entities/User";
import { Paper } from "../entities/Paper";
import { PaperUser } from "../entities/PaperUser";
import ApiServer from "../server";
import { PaperUserRole } from "../types/paperUsers";
import { ScriptTemplatePostData } from "../types/scriptTemplates";
import { ScriptPostData } from "../types/scripts";

export async function synchronize(apiServer: ApiServer) {
  if (!apiServer.connection) {
    throw new Error("Connection failed to initialise");
  }
  await apiServer.connection.synchronize(true);
}

export class Fixtures {
  // Other
  faker: Faker.FakerStatic;

  // Instantiated
  public paper: Paper;
  public owner: PaperUser;
  public ownerAccessToken: string;
  public marker: PaperUser;
  public markerAccessToken: string;
  public student: PaperUser;
  public studentAccessToken: string;

  // Not instantiated
  public scriptTemplatePostData: ScriptTemplatePostData;
  public scriptPostData: ScriptPostData;

  constructor(
    paper: Paper,
    owner: PaperUser,
    marker: PaperUser,
    student: PaperUser
  ) {
    this.faker = faker;
    this.paper = paper;
    this.owner = owner;
    this.ownerAccessToken =
      "Bearer " + owner.user!.createAuthenticationTokens().accessToken;
    this.marker = marker;
    this.markerAccessToken =
      "Bearer " + marker.user!.createAuthenticationTokens().accessToken;
    this.student = student;
    this.studentAccessToken =
      "Bearer " + student.user!.createAuthenticationTokens().accessToken;

    this.scriptTemplatePostData = {
      questionTemplates: [
        {
          name: "1",
          score: null
        },
        {
          name: "1a",
          parentName: "1",
          score: 2
        },
        {
          name: "1b",
          parentName: "1",
          score: 3
        },
        {
          name: "2",
          score: 3
        },
        {
          name: "3",
          score: 5
        }
      ]
    };

    this.scriptPostData = {
      email: faker.internet.email()
    };
  }
}

export async function loadFixtures(apiServer: ApiServer): Promise<Fixtures> {
  const paper = new Paper();
  paper.name = "CS1010 Midterms";

  const paperUsers: PaperUser[] = [];
  const users: User[] = [];

  const owner = new PaperUser();
  owner.paper = paper;
  owner.user = new User();
  owner.user.email = "owner@u.nus.edu";
  owner.user.password = hashSync("setMeUp?");
  owner.role = PaperUserRole.Owner;
  users.push(owner.user);
  paperUsers.push(owner);

  const marker = new PaperUser();
  marker.paper = paper;
  marker.user = new User();
  marker.user.email = "marker@u.nus.edu";
  marker.user.password = hashSync("setMeUp?");
  marker.role = PaperUserRole.Marker;
  users.push(marker.user);
  paperUsers.push(marker);

  const student = new PaperUser();
  student.paper = paper;
  student.user = new User();
  student.user.email = "student@u.nus.edu";
  student.role = PaperUserRole.Student;
  users.push(student.user);
  paperUsers.push(student);

  await getRepository(User).save(users);
  await getRepository(Paper).save(paper);
  await getRepository(PaperUser).save(paperUsers);

  return new Fixtures(paper, owner, marker, student);
}

export async function getToken(
  server: ApiServer,
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const encoded = Buffer.from(`${email}:${password}`).toString("base64");
  const response = await supertest(server.server)
    .post("/v1/auth/token")
    .set("Authorization", `Basic ${encoded}`)
    .send();
  return response.body;
}

export async function getAuthorizationToken(
  server: ApiServer,
  email: string
): Promise<string> {
  const response = await supertest(server.server)
    .post("/v1/auth/passwordless")
    .send({ email });
  if (response.status !== 201) {
    throw new Error("Mock getAuthorizationToken failed");
  }
  const user = await getRepository(User).findOneOrFail({ email });
  return user.createAuthorizationToken();
}

export async function getPasswordlessToken(
  server: ApiServer,
  authorizationToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await supertest(server.server)
    .post("/v1/auth/token")
    .set("Authorization", `Bearer ${authorizationToken}`)
    .send();
  return response.body;
}