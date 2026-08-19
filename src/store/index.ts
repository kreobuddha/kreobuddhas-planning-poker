import { configureStore } from '@reduxjs/toolkit';
import { emptyApi } from '@/store/emptyApi';
import rootReducer from '@/store/rootReducer';

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(emptyApi.middleware),
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
