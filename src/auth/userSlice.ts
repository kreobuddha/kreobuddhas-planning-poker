import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  uid: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  uid: null,
  loading: true,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUid: (state, action: PayloadAction<string>) => {
      state.uid = action.payload;
      state.loading = false;
      state.error = null;
    },
    setAuthError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { setUid, setAuthError } = userSlice.actions;
export default userSlice.reducer;
