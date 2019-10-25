import { Entity, ManyToOne, OneToMany, Column, getRepository } from "typeorm";
import { Annotation } from "./Annotation";
import { Discardable } from "./Discardable";
import { PageQuestion } from "./PageQuestion";
import { Script } from "./Script";
import { PageListData, PageData } from "../types/pages";

@Entity()
export class Page extends Discardable {
  entityName = "Page";

  @Column()
  scriptId!: number;

  @ManyToOne(type => Script, script => script.pages)
  script?: Script;

  @OneToMany(type => PageQuestion, pageQuestion => pageQuestion.page)
  pageQuestions?: PageQuestion[];

  @OneToMany(type => Annotation, annotation => annotation.page)
  annotations?: Annotation[];

  getListData = async (): Promise<PageListData> => ({
    ...this.getBase(),
    scriptId: this.scriptId,
    pageQuestionsCount: this.pageQuestions
      ? this.pageQuestions.length
      : await getRepository(PageQuestion).count({ pageId: this.id }),
    annotationsCount: this.annotations
      ? this.annotations.length
      : await getRepository(Annotation).count({ pageId: this.id })
  });

  getData = async (): Promise<PageData> => {
    const pageQuestions =
      this.pageQuestions ||
      (await getRepository(PageQuestion).find({ pageId: this.id }));
    const annotations =
      this.annotations ||
      (await getRepository(Annotation).find({ pageId: this.id }));

    return {
      ...(await this.getListData()),
      scriptId: this.scriptId,
      pageQuestions: await Promise.all(
        pageQuestions.map(pageQuestion => pageQuestion.getListData())
      ),
      annotations: await Promise.all(
        annotations.map(pageQuestion => pageQuestion.getListData())
      )
    };
  };
}