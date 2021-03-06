import { AxiosResponse } from "axios";
import { ScriptMappingData } from "backend/src/types/paperUsers";
import {
  ScriptData,
  ScriptListData,
  ScriptPatchData,
  ScriptPostData
} from "backend/src/types/scripts";
import {
  ScriptDownloadData,
  ScriptMarkingData,
  ScriptViewData
} from "backend/src/types/view";
import { sha256 } from "js-sha256";
import PDFJS from "pdfjs-dist/webpack";
import { getPage } from "../utils/canvas";
import client from "./client";

const URL = "/scripts";

export async function createScript(
  id: number,
  scriptPostData: ScriptPostData
): Promise<AxiosResponse<{ script: ScriptListData }>> {
  return client.post(`/papers/${id}/scripts`, scriptPostData, {
    timeout: 250000
  });
}

export async function matchScriptsToStudents(
  id: number,
  scriptMappingData: ScriptMappingData
): Promise<
  AxiosResponse<{ successfullyMatched: string; failedToBeMatched: string }>
> {
  return client.patch(`/papers/${id}/scripts/match`, scriptMappingData, {
    timeout: 120000
  });
}

export async function viewScript(id: number) {
  return await client.get<{ script: ScriptViewData }>(`${URL}/${id}/view`);
}

export async function downloadScript(id: number) {
  return await client.get<{ script: ScriptDownloadData }>(
    `${URL}/${id}/download`
  );
}

export async function getScripts(
  paperId: number
): Promise<AxiosResponse<{ scripts: ScriptListData[] }>> {
  return client.get(`/papers/${paperId}/scripts`);
}

export async function patchScript(
  id: number,
  scriptPatchData: ScriptPatchData
): Promise<AxiosResponse<{ script: ScriptListData }>> {
  return client.patch(`${URL}/${id}`, scriptPatchData);
}

export async function discardScript(id: number): Promise<AxiosResponse> {
  return client.delete(`${URL}/${id}`);
}

export async function discardScripts(paperId: number): Promise<AxiosResponse> {
  return client.delete(`/papers/${paperId}/all_scripts`);
}

export async function undiscardScript(
  id: number
): Promise<AxiosResponse<{ script: ScriptData }>> {
  return client.patch(`${URL}/${id}/undiscard`);
}

export async function postScript(
  paper_id: number,
  filename: string,
  file: File,
  onSuccess: () => void,
  onFail: (error) => void,
  atLoadEnd: () => void
) {
  const reader = new FileReader();
  reader.onloadend = () => {
    const pdfAsString = String(reader.result);
    PDFJS.getDocument(pdfAsString).promise.then(async pdf => {
      const pages: any = [];
      for (let i = 0; i < pdf.numPages; i++) {
        pages.push(getPage(i + 1, pdf));
      }
      const scriptPostData: ScriptPostData = {
        filename,
        sha256: sha256(pdfAsString),
        imageUrls: await Promise.all(pages)
      };
      createScript(paper_id, scriptPostData)
        .then(onSuccess)
        .catch(onFail)
        .finally(atLoadEnd);
    });
  };
  await reader.readAsDataURL(file);
}

export async function markScript(
  scriptId: number,
  rootQuestionTemplateId: number
) {
  return client.get<ScriptMarkingData>(
    `${URL}/${scriptId}/question_templates/${rootQuestionTemplateId}`
  );
}
