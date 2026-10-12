import Pip, { type PipMood } from "../Pip";
import { Ic } from "./icons";

/**
 * Shared "nothing here yet" block. Keep the message honest and give one next step.
 * Use Pip sparingly (one per screen); otherwise pass an icon.
 */
export default function EmptyState({
  title,
  body,
  mood,
  icon,
  action,
  compact = false,
}: {
  title: string;
  body: string;
  mood?: PipMood;
  icon?: readonly string[];
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`empty ${compact ? "compact" : ""}`}>
      {mood ? <Pip mood={mood} size={compact ? 52 : 72} motion={!compact} decorative /> : icon ? <span className="empty-ic"><Ic d={icon} small={false} /></span> : null}
      <strong>{title}</strong>
      <p>{body}</p>
      {action}
    </div>
  );
}
