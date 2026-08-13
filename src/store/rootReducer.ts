import userReducer from '@/auth/userSlice';
import { emptyApi } from '@/store/emptyApi';

const rootReducer = {
  user: userReducer,
  [emptyApi.reducerPath]: emptyApi.reducer,
};

export default rootReducer;
