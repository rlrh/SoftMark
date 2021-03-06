import { AxiosResponse } from "axios";
import { GradingData } from "backend/src/types/grading";
import {
  PaperData,
  PaperPatchData,
  PaperPostData
} from "backend/src/types/papers";
import { ScriptTemplateSetupData } from "backend/src/types/scriptTemplates";
import { PaperUserData, PaperUserPostData } from "../types/paperUsers";
import client from "./client";

const URL = "/papers";

export async function createPaper(
  paperPostData: PaperPostData
): Promise<AxiosResponse<{ paper: PaperData }>> {
  return client.post(`${URL}`, paperPostData);
}

export async function getPapers(): Promise<
  AxiosResponse<{ papers: PaperData[] }>
> {
  return client.get(`${URL}`);
}

export async function getPaper(
  id: number
): Promise<AxiosResponse<{ paper: PaperData }>> {
  return await client.get(`${URL}/${id}`);
}

export async function editPaper(
  id: number,
  paperPatchData: PaperPatchData
): Promise<AxiosResponse<{ paper: PaperData }>> {
  return client.patch(`${URL}/${id}`, paperPatchData);
}

export async function discardPaper(id: number): Promise<AxiosResponse> {
  return client.delete(`${URL}/${id}`);
}

export async function createPaperUser(
  id: number,
  paperUserPostData: PaperUserPostData
): Promise<AxiosResponse<PaperUserData>> {
  return client.post(`${URL}/${id}/users`, paperUserPostData);
}

export async function getScriptTemplateSetupData(paperId: number) {
  return await client.get<ScriptTemplateSetupData>(
    `${URL}/${paperId}/script_template/setup`
  );
}

export async function getGradingData(paperId: number) {
  return await client.get<GradingData>(`${URL}/${paperId}/grading`);
}

export async function publish(paperId: number) {
  return await client.post<{ publishedCount: number }>(
    `${URL}/${paperId}/publish`
  );
}

export async function getUnmatchedScripts(paperId: number) {
  return await client.get<{ scripts: { filename: string }[] }>(
    `${URL}/${paperId}/unmatched_scripts`
  );
}

export async function getUnmatchedStudents(paperId: number) {
  return await client.get<{ students: { matriculationNumber: string }[] }>(
    `${URL}/${paperId}/unmatched_students`
  );
}
