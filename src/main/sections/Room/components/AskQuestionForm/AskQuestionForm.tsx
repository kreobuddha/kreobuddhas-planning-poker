import './AskQuestionForm.scss';
import type { FormEvent, ReactElement } from 'react';
import { Button, TextField } from '@kreobuddha/ui';
import { QUESTION_MAX_LENGTH } from '@/config';

interface AskQuestionFormProps {
  question: string;
  busy: boolean;
  onQuestionChange: (question: string) => void;
  onSubmit: (e: FormEvent) => void;
}

const AskQuestionForm = ({
  question,
  busy,
  onQuestionChange,
  onSubmit,
}: AskQuestionFormProps): ReactElement => {
  return (
    <form onSubmit={onSubmit} className="ask-question-form">
      <h2>Ask a question</h2>
      <TextField
        label="What are we estimating?"
        value={question}
        maxLength={QUESTION_MAX_LENGTH}
        onChange={(e) => onQuestionChange(e.target.value)}
        fullWidth
      />
      <Button type="submit" loading={busy} disabled={!question.trim()}>
        Start voting
      </Button>
    </form>
  );
};

export default AskQuestionForm;
