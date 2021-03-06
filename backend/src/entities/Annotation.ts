import { IsNotEmpty } from "class-validator";
import { Column, Entity, ManyToOne } from "typeorm";
import { AnnotationData, AnnotationLine } from "../types/annotations";
import { Base } from "./Base";
import { Page } from "./Page";
import { PaperUser } from "./PaperUser";

@Entity()
export class Annotation extends Base {
  entityName = "Annotation";

  constructor(
    page: number | Page,
    paperUser: PaperUser,
    layer: AnnotationLine[]
  ) {
    super();
    if (typeof page === "number") {
      this.pageId = page;
    } else {
      this.page = page;
    }
    this.paperUser = paperUser;
    this.layer = layer;
  }

  @Column()
  pageId!: number;

  @ManyToOne(type => Page, page => page.annotations)
  page?: Page;

  @Column()
  paperUserId!: number;

  @ManyToOne(type => PaperUser, paperUser => paperUser.annotations)
  paperUser?: PaperUser;

  @Column({ type: "jsonb" })
  @IsNotEmpty()
  layer: AnnotationLine[];

  getData = (): AnnotationData => {
    return {
      ...this.getBase(),
      pageId: this.pageId,
      paperUserId: this.paperUserId,
      layer: this.layer
    };
  };
}
