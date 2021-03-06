import usePaper from "contexts/PaperContext";
import useScriptsAndStudents from "contexts/ScriptsAndStudentsContext";
import { DropAreaBase } from "material-ui-file-dropzone";
import React from "react";
import { toast } from "react-toastify";
import api from "../../api";

const UploadScriptsWrapper: React.FC = props => {
  const paper = usePaper();
  const { refreshScripts } = useScriptsAndStudents();
  const { children } = props;

  return (
    <DropAreaBase
      accept={".pdf"}
      clickable
      multiple
      onSelectFiles={async files => {
        toast.info("Attempting to upload files");
        const keys = Object.keys(files);
        let scriptUploaded = 0;
        let scriptsLeft = keys.length;
        const asynchronousPostScript = async (index: number, limit: number) => {
          scriptsLeft--;
          if (index < limit) {
            const key = keys[index];
            const file = files[key];
            const fileName = file.name;
            const onSuccess = () => {
              scriptUploaded++;
              if (scriptsLeft === 0 || scriptUploaded % 30 === 0) {
                setTimeout(refreshScripts, 3000);
              }
              toast.success(
                `Script ${fileName} has been uploaded successfully.\n` +
                  scriptUploaded +
                  ` script(s) uploaded successfully.`
              );
            };
            const onFail = error => {
              toast.error(
                `Script ${fileName} could not be uploaded.\n${error.response.data}`,
                {
                  autoClose: false
                }
              );
            };
            const atLoadEnd = () => {
              if (scriptsLeft === 0) {
                refreshScripts();
              }
              asynchronousPostScript(index + 1, limit);
            };
            await api.scripts.postScript(
              paper.id,
              fileName,
              file,
              onSuccess,
              onFail,
              atLoadEnd
            );
          }
        };
        const threads = 3;
        let prevUpperLimitForIndex = 0;
        let upperLimitForIndex = 0;
        for (let i = 1; i <= threads; i++) {
          upperLimitForIndex = Math.floor((i / threads) * keys.length);
          if (prevUpperLimitForIndex !== upperLimitForIndex) {
            asynchronousPostScript(prevUpperLimitForIndex, upperLimitForIndex);
            prevUpperLimitForIndex = upperLimitForIndex;
          }
        }
      }}
    >
      {children}
    </DropAreaBase>
  );
};

export default UploadScriptsWrapper;
