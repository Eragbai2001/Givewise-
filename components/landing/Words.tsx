import { Fragment } from "react";

/** Splits a headline into words that rise out of a mask when revealed. */
export default function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <Fragment key={i}>
          <span className="w" style={{ ["--i" as string]: i }}>
            <span>{w}</span>
          </span>{" "}
        </Fragment>
      ))}
    </>
  );
}
