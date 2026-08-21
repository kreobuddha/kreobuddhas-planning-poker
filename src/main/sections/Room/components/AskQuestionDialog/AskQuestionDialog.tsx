import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { Button, Dialog } from '@kreobuddha/ui';
import AskQuestionForm from '@/main/sections/Room/components/AskQuestionForm/AskQuestionForm';

interface AskQuestionDialogProps {
  question: string;
  busy: boolean;
  onQuestionChange: (question: string) => void;
  onSubmit: (e: FormEvent) => void;
}

// The form is behind a button once a round has been played: the cards from the last question are
// what the room is looking at, and a form standing open beside them asks everyone to read past it.
const AskQuestionDialog = ({
  question,
  busy,
  onQuestionChange,
  onSubmit,
}: AskQuestionDialogProps): ReactElement => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Ask next question</Button>

      <Dialog
        open={open}
        title="Ask the next question"
        dismissible
        // The panel holds something typed, and a stray click beside it would throw it away.
        dismissOnBackdrop={false}
        onClose={() => setOpen(false)}
      >
        <AskQuestionForm
          question={question}
          busy={busy}
          onQuestionChange={onQuestionChange}
          // Closed on submit rather than on success: the new round arrives as a snapshot, and a
          // panel that waited for it would sit over the table it just changed. A write that fails
          // is a toast, and the draft it was holding survives — the question is only cleared once
          // the round exists.
          onSubmit={(e) => {
            setOpen(false);
            onSubmit(e);
          }}
        />
      </Dialog>
    </>
  );
};

export default AskQuestionDialog;
