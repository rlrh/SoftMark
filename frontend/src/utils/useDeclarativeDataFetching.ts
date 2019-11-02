import { useEffect, useReducer } from "react";
import { AxiosResponse } from "axios";

interface DataFetchState {
  isLoading: boolean;
  isError: boolean;
  data: any;
}

interface DataFetchAction {
  type: DataFetchActionType;
  payload?: any;
}

enum DataFetchActionType {
  FetchInit = "FETCH_INIT",
  FetchSuccess = "FETCH_SUCCESS",
  FetchFailure = "FETCH_FAILURE"
}

const dataFetchReducer = (state: DataFetchState, action: DataFetchAction) => {
  switch (action.type) {
    case DataFetchActionType.FetchInit:
      return {
        ...state,
        isLoading: true,
        isError: false
      };
    case DataFetchActionType.FetchSuccess:
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: action.payload
      };
    case DataFetchActionType.FetchFailure:
      return {
        ...state,
        isLoading: false,
        isError: true
      };
    default:
      throw new Error();
  }
};

const useDeclarativeDataFetching = (axiosPromiseFn, ..._arguments) => {
  const initialState: DataFetchState = {
    isLoading: false,
    isError: false,
    data: null
  };

  const [state, dispatch] = useReducer(dataFetchReducer, initialState);

  useEffect(() => {
    let didCancel = false;
    const fetchData = async () => {
      dispatch({ type: DataFetchActionType.FetchInit });
      try {
        const result = await axiosPromiseFn(..._arguments);
        if (!didCancel) {
          dispatch({
            type: DataFetchActionType.FetchSuccess,
            payload: result.data
          });
        }
      } catch (error) {
        if (!didCancel) {
          dispatch({ type: DataFetchActionType.FetchFailure });
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, _arguments);

  return state as DataFetchState;
};

export default useDeclarativeDataFetching;
