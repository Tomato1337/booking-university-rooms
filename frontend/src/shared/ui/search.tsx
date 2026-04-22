import { IconSearch } from "@tabler/icons-react";
import React from "react";
import { Input } from "./input";
import { reatomComponent, useWrap } from "@reatom/react";
import { cn } from "../lib/utils";

interface SearchProps extends React.ComponentPropsWithoutRef<"div"> {
  query: string;
  wrapSearch: (value: string) => void;
  placeholder?: string;
}

const Search = reatomComponent(
  ({ query, wrapSearch, placeholder, className, ...props }: SearchProps) => {
    const searchHTMLRef = React.useRef<HTMLInputElement>(null);
    return (
      <div
        {...props}
        onClick={() => {
          if (searchHTMLRef.current) {
            searchHTMLRef.current.focus();
          }
        }}
        className={cn("flex items-center gap-3 bg-surface-container px-4 py-3", className)}
      >
        <label htmlFor="room-search" className="text-on-surface-variant">
          <IconSearch size={18} className="shrink-0 text-on-surface-variant" />
        </label>
        <Input
          ref={searchHTMLRef}
          type="text"
          id="room-search"
          value={query}
          onChange={useWrap((e) => wrapSearch(e.target.value))}
          placeholder={placeholder || "SEARCH..."}
          className="w-full border-none bg-transparent text-xs font-bold uppercase tracking-widest text-on-surface outline-none placeholder:text-on-surface-variant/50"
        />
      </div>
    );
  },
);

export default Search;
