import React, { useState } from "react";
import api from "../../api";
import { DropAreaBase } from "material-ui-file-dropzone";
import { Dialog, DialogContent, DialogContentText } from "@material-ui/core";
import { NominalRollPostData } from "backend/src/types/paperUsers";
import { toast } from "react-toastify";
import usePaper from "contexts/PaperContext";
import { DialogTitle } from "@material-ui/core";
import useScriptsAndStudents from "contexts/ScriptsAndStudentsContext";
import LoadingSpinner from "components/LoadingSpinner";
import Papa from "papaparse";

interface Props {
  clickable?: boolean;
}

const UploadNominalRollWrapper: React.FC<Props> = props => {
  const paper = usePaper();
  const {
    refreshAllStudents,
    refreshUnmatchedStudents
  } = useScriptsAndStudents();
  const { children, clickable = true } = props;

  const [isSavingStudents, setIsSavingStudents] = useState(false);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [studentsThatSucceeded, setStudentsThatSucceeded] = useState("None");
  const [studentsThatFailed, setStudentsThatFailed] = useState("None");

  const responseDialog = (
    <Dialog
      fullWidth
      open={isResponseDialogOpen}
      onClose={() => {
        setIsResponseDialogOpen(false);
        setStudentsThatSucceeded("None");
        setStudentsThatFailed("None");
      }}
    >
      {isSavingStudents && (
        <LoadingSpinner loadingMessage="Saving students..." />
      )}
      {!isSavingStudents && (
        <>
          <DialogTitle>Result of upload</DialogTitle>
          <DialogContent dividers>
            <DialogContentText>Successfully added students</DialogContentText>
            {splitStringIntoLines(studentsThatSucceeded)}
            <br />
            <br />
            <br />
            <DialogContentText>
              Students that were not successfully uploaded
            </DialogContentText>
            {splitStringIntoLines(studentsThatFailed)}
          </DialogContent>
        </>
      )}
    </Dialog>
  );

  return (
    <>
      <DropAreaBase
        accept={".csv"}
        clickable={clickable}
        multiple={false}
        onSelectFiles={files => {
          Object.keys(files).forEach(key => {
            setIsSavingStudents(true);
            setIsResponseDialogOpen(true);
            const file = files[key];
            Papa.parse(file, {
              complete: results => {
                const nominalRollPostData: NominalRollPostData = {
                  rows: results.data
                };
                api.paperUsers
                  .createStudents(paper.id, nominalRollPostData)
                  .then(resp => {
                    setStudentsThatFailed(resp.data.failedToBeAdded);
                    setStudentsThatSucceeded(resp.data.successfullyAdded);
                    setIsSavingStudents(false);
                    setIsResponseDialogOpen(true);
                    toast.success(`Account for students created successfully.`);
                  })
                  .catch(() => {
                    setIsSavingStudents(false);
                    setIsResponseDialogOpen(false);
                    toast.error(`Accounts for students could not be created.`);
                  })
                  .finally(() => {
                    refreshUnmatchedStudents();
                    refreshAllStudents();
                  });
              }
            });
          });
        }}
      >
        {children}
      </DropAreaBase>
      {responseDialog}
    </>
  );
};

export default UploadNominalRollWrapper;

const splitStringIntoLines = (str: string) => {
  if (str.toLocaleLowerCase() === "none") {
    return str;
  }
  const lines = str.split("\n");
  return lines.map((line, index) =>
    line !== "" ? (
      <>
        {`${index + 1}. ${line}`}
        <br />
      </>
    ) : (
      line
    )
  );
};
