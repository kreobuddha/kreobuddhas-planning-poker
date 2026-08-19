import './JoinForm.scss';
import type { FormEvent, ReactElement } from 'react';
import { Button, TextField } from '@kreobuddha/ui';
import { NAME_MAX_LENGTH } from '@/config';

interface JoinFormProps {
  code: string;
  name: string;
  busy: boolean;
  onNameChange: (name: string) => void;
  onSubmit: (e: FormEvent) => void;
}

const JoinForm = ({ code, name, busy, onNameChange, onSubmit }: JoinFormProps): ReactElement => {
  return (
    <div className="join-form">
      <form onSubmit={onSubmit} className="join-form__card">
        <h1>Join session {code}</h1>
        <TextField
          label="Your name"
          value={name}
          maxLength={NAME_MAX_LENGTH}
          onChange={(e) => onNameChange(e.target.value)}
          fullWidth
        />
        <Button type="submit" loading={busy} disabled={!name.trim()}>
          Join
        </Button>
      </form>
    </div>
  );
};

export default JoinForm;
