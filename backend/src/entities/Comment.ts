import { IsNotEmpty, IsString } from "class-validator";
import { Entity, ManyToOne, Column } from "typeorm";
import { Discardable } from "./Discardable";
import { PaperUser } from "./PaperUser";
import { Question } from "./Question";

@Entity()
export class Comment extends Discardable {
  entityName = "Comment";

  @ManyToOne(type => Question, question => question.comments)
  question!: Question;

  @ManyToOne(type => PaperUser, paperUser => paperUser.comments)
  paperUser!: PaperUser;

  @Column()
  @IsNotEmpty()
  @IsString()
  comment!: string;
}