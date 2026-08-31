/**
 * One turn.
 *
 * The visitor's words get a hairline box; the assistant's do not. That
 * asymmetry is the whole design — two symmetrical bubble columns would read as
 * a messaging app, and this is meant to read as a document with your side
 * marked. Errors are a third register: a red rule in the margin, no box.
 */
export default function AIChatMessage({ role, text }) {
  if (role === "user") {
    return (
      <div className="ts-ai-msg ts-ai-msg--user">
        <p className="ts-body text-[0.9rem] whitespace-pre-wrap">{text}</p>
      </div>
    );
  }

  if (role === "error") {
    return (
      <div className="ts-ai-msg ts-ai-msg--error" role="alert">
        <p className="ts-body text-[0.9rem]">{text}</p>
      </div>
    );
  }

  return (
    <div className="ts-ai-msg ts-ai-msg--ai">
      <p className="ts-body text-[0.925rem] leading-[1.6] whitespace-pre-wrap">{text}</p>
    </div>
  );
}
