import { createContext, useContext } from "react";

const noop = () => {};

const PageMetaContext = createContext({
  pageMeta: {
    title: "",
    description: "",
  },
  setPageMeta: noop,
});

export function PageMetaProvider({ value, children }) {
  return <PageMetaContext.Provider value={value}>{children}</PageMetaContext.Provider>;
}

export function usePageMeta() {
  return useContext(PageMetaContext);
}
