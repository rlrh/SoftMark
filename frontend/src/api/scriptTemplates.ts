import { AxiosResponse } from "axios";
import {
  ScriptTemplateData,
  ScriptTemplatePostData
} from "backend/src/types/scriptTemplates";
import { sha256 } from "js-sha256";
import PDFJS from "pdfjs-dist/webpack";
import { getPage } from "../utils/canvas";
import client from "./client";

const URL = "/script_templates";

export async function createScriptTemplate(
  id: number,
  scriptTemplatePostData: ScriptTemplatePostData
): Promise<AxiosResponse<{ scriptTemplate: ScriptTemplateData }>> {
  return client.post(`/papers/${id}/script_templates`, scriptTemplatePostData);
}

export async function getScriptTemplate(
  paperId: number
): Promise<AxiosResponse<{ scriptTemplate: ScriptTemplateData }>> {
  return client.get(`/papers/${paperId}/script_templates/active`);
}

export async function discardScriptTemplate(
  id: number
): Promise<AxiosResponse> {
  return client.delete(`${URL}/${id}`);
}

export async function undiscardScriptTemplate(
  id: number
): Promise<AxiosResponse<{ scriptTemplate: ScriptTemplateData }>> {
  return client.patch(`${URL}/${id}/undiscard`);
}

export async function postScriptTemplate(
  paper_id: number,
  file: File,
  onSuccess: () => void,
  onFail: () => void
) {
  const reader = new FileReader();
  reader.onloadend = () => {
    const pdfAsString = String(reader.result);
    PDFJS.getDocument(pdfAsString).promise.then(async pdf => {
      const pages: any = [];
      for (let i = 0; i < pdf.numPages; i++) {
        pages.push(getPage(i + 1, pdf));
      }
      const scriptTemplatePostData: ScriptTemplatePostData = {
        imageUrls: await Promise.all(pages),
        sha256: sha256(pdfAsString)
      };
      createScriptTemplate(paper_id, scriptTemplatePostData)
        .then(onSuccess)
        .catch(errors => {
          onFail();
        });
    });
  };
  reader.readAsDataURL(file);
}
