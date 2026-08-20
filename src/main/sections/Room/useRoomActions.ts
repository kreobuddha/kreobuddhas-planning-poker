import { useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@kreobuddha/ui';
import type { CardValue, DeckKey } from '@/config';
import { readStoredName, storeName } from '@/lib/storedName';
import type { IParticipant, IRound, ISession, IVote } from '@/types';
import {
  useCreateParticipantMutation,
  useRenameParticipantMutation,
} from '@/main/endpoints/participantsApi';
import { errorMessage } from '@/store/queryError';
import {
  useAskQuestionMutation,
  useCastVoteMutation,
  useClearVoteMutation,
  useCloseSessionMutation,
  useExtendSessionMutation,
  useRemoveParticipantMutation,
  useReopenRoundMutation,
  useRevealVotesMutation,
  useSetDeckMutation,
  useTransferAdminMutation,
} from '@/main/sections/Room/endpoints/roomApi';

interface RoomActionsArgs {
  userId: string;
  session: ISession | undefined;
  round: IRound | null;
  me: IParticipant | null;
  myVote: IVote | null;
  votingOpen: boolean;
}

interface RoomActions {
  question: string;
  setQuestion: Dispatch<SetStateAction<string>>;
  nameDraft: string;
  setNameDraft: Dispatch<SetStateAction<string>>;
  asking: boolean;
  voting: boolean;
  revealing: boolean;
  reopening: boolean;
  settingDeck: boolean;
  joining: boolean;
  extending: boolean;
  closing: boolean;
  renaming: boolean;
  removing: boolean;
  handingOverId: string | null;
  removingId: string | null;
  handleAskQuestion: (e: FormEvent) => Promise<void>;
  handleVote: (value: CardValue) => Promise<void>;
  handleReveal: () => Promise<void>;
  handleReopen: () => Promise<void>;
  handleExtend: () => Promise<void>;
  handleCloseRoom: () => Promise<void>;
  handleMakeAdmin: (nextAdminId: string) => Promise<void>;
  handleRename: (name: string) => Promise<void>;
  handleLeave: () => Promise<void>;
  handleRemove: (targetId: string) => Promise<void>;
  handleDeckChange: (next: DeckKey) => Promise<void>;
  handleJoin: (e: FormEvent) => Promise<void>;
}

// Everything the room writes: the mutations, the flags that say which of them is in flight, and
// the handlers the markup binds to. What it reads comes from useRoomData and arrives as arguments,
// so the two hooks share a view of the room without either one owning the other.
export const useRoomActions = ({
  userId,
  session,
  round,
  me,
  myVote,
  votingOpen,
}: RoomActionsArgs): RoomActions => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [question, setQuestion] = useState('');
  const [nameDraft, setNameDraft] = useState(readStoredName);

  // An action that failed is news, not a state of the screen: the session behind it is still
  // live and usable, so it is reported over the room and goes away on its own.
  const reportFailure = (err: unknown, fallback: string): void => {
    toast({ tone: 'danger', children: errorMessage(err, fallback) });
  };

  const [askQuestion, { isLoading: asking }] = useAskQuestionMutation();
  const [castVote, { isLoading: casting }] = useCastVoteMutation();
  const [clearVote, { isLoading: clearing }] = useClearVoteMutation();
  const [revealVotes, { isLoading: revealing }] = useRevealVotesMutation();
  const [reopenRound, { isLoading: reopening }] = useReopenRoundMutation();
  const [setDeck, { isLoading: settingDeck }] = useSetDeckMutation();
  const [createParticipant, { isLoading: joining }] = useCreateParticipantMutation();
  const [extendSession, { isLoading: extending }] = useExtendSessionMutation();
  const [closeSession, { isLoading: closing }] = useCloseSessionMutation();
  const [transferAdmin] = useTransferAdminMutation();
  const [renameParticipant, { isLoading: renaming }] = useRenameParticipantMutation();
  const [removeParticipant, { isLoading: removing }] = useRemoveParticipantMutation();
  // Which row is busy, not whether any is: one flag put a spinner in every row at once.
  const [handingOverId, setHandingOverId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAskQuestion = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!session || !question.trim()) return;
    try {
      await askQuestion({ sessionId: session.id, question: question.trim() }).unwrap();
      setQuestion('');
    } catch (err) {
      reportFailure(err, 'Could not start round.');
    }
  };

  // Picking the card you already hold clears the vote, which is the only way back to "waiting".
  const handleVote = async (value: CardValue): Promise<void> => {
    if (!session || !round || !me) return;
    const target = { sessionId: session.id, roundId: round.id, userId };
    try {
      if (myVote?.value === value) {
        await clearVote(target).unwrap();
        return;
      }
      await castVote({ ...target, value }).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not submit vote.');
    }
  };

  const handleReveal = async (): Promise<void> => {
    if (!session || !round) return;
    try {
      await revealVotes({ sessionId: session.id, roundId: round.id }).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not reveal votes.');
    }
  };

  const handleReopen = async (): Promise<void> => {
    if (!session || !round) return;
    try {
      await reopenRound({ sessionId: session.id, roundId: round.id }).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not reopen the round.');
    }
  };

  const handleExtend = async (): Promise<void> => {
    if (!session) return;
    try {
      await extendSession(session.id).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not extend this room.');
    }
  };

  const handleCloseRoom = async (): Promise<void> => {
    if (!session) return;
    try {
      await closeSession(session.id).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not close this room.');
    }
  };

  const handleMakeAdmin = async (nextAdminId: string): Promise<void> => {
    if (!session) return;
    setHandingOverId(nextAdminId);
    try {
      await transferAdmin({ sessionId: session.id, userId: nextAdminId }).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not hand the room over.');
    } finally {
      setHandingOverId(null);
    }
  };

  const handleRename = async (name: string): Promise<void> => {
    if (!session) return;
    try {
      await renameParticipant({ sessionId: session.id, userId, name }).unwrap();
      storeName(name);
      setNameDraft(name);
    } catch (err) {
      reportFailure(err, 'Could not change your name.');
    }
  };

  // Clearing the vote is part of leaving, so it only travels with an open round: once the cards
  // are on the table nothing may rewrite them, and the rules say so too.
  const openRoundId = votingOpen && round ? round.id : undefined;

  const handleLeave = async (): Promise<void> => {
    if (!session) return;
    try {
      await removeParticipant({ sessionId: session.id, userId, roundId: openRoundId }).unwrap();
      navigate('/', { replace: true });
    } catch (err) {
      reportFailure(err, 'Could not leave this room.');
    }
  };

  const handleRemove = async (targetId: string): Promise<void> => {
    if (!session) return;
    setRemovingId(targetId);
    try {
      await removeParticipant({
        sessionId: session.id,
        userId: targetId,
        roundId: openRoundId,
      }).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not remove this participant.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleDeckChange = async (next: DeckKey): Promise<void> => {
    if (!session) return;
    try {
      await setDeck({ sessionId: session.id, deck: next }).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not change the deck.');
    }
  };

  // Reaching a room by its link rather than through Home means never having been asked for a
  // name, so ask here instead of leaving an invisible participant who shows up as "Unknown"
  // once the votes are revealed. Always a create: the form is only rendered when the participant
  // list has loaded and does not hold this uid.
  const handleJoin = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!session || !nameDraft.trim()) return;
    try {
      await createParticipant({ sessionId: session.id, userId, name: nameDraft.trim() }).unwrap();
      storeName(nameDraft.trim());
    } catch (err) {
      reportFailure(err, 'Could not join this session.');
    }
  };

  return {
    question,
    setQuestion,
    nameDraft,
    setNameDraft,
    asking,
    // One flag for the card grid: casting and clearing are the same gesture from the reader's
    // side, and the grid has no way to show two different kinds of busy.
    voting: casting || clearing,
    revealing,
    reopening,
    settingDeck,
    joining,
    extending,
    closing,
    renaming,
    removing,
    handingOverId,
    removingId,
    handleAskQuestion,
    handleVote,
    handleReveal,
    handleReopen,
    handleExtend,
    handleCloseRoom,
    handleMakeAdmin,
    handleRename,
    handleLeave,
    handleRemove,
    handleDeckChange,
    handleJoin,
  };
};
