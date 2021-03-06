import { AxiosResponse } from "axios";
import { MarkData, MarkPutData } from "backend/src/types/marks";
import { UnparseObject } from "papaparse";
import client from "./client";

const URL = "/marks";

export async function replaceMark(
  questionId: number,
  data: MarkPutData
): Promise<AxiosResponse<{ mark: MarkData }>> {
  return client.put(`/questions/${questionId}/mark`, data);
}

export async function discardMark(markId: number) {
  return client.delete(`${URL}/${markId}`);
}

export async function undiscardMark(
  markId: number
): Promise<AxiosResponse<{ mark: MarkData }>> {
  return client.patch(`${URL}/${markId}/undiscard`);
}

export async function exportMarks(paperId: number) {
  return client.get<{ marks: UnparseObject }>(
    `/papers/${paperId}/export_marks`
  );
}
