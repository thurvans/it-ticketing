import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router-dom";
import { cn } from "@/utils/formatters";

const TONE_CLASSNAMES = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
  ghost: "btn-ghost",
};

function getActionClassName({ tone, mobileIconOnly, fullWidth, className }) {
  return cn(
    TONE_CLASSNAMES[tone] || TONE_CLASSNAMES.secondary,
    mobileIconOnly ? "h-11 w-11 rounded-xl p-0 sm:h-auto sm:w-auto sm:px-4 sm:py-2.5" : "",
    fullWidth ? "w-full" : "",
    className,
  );
}

function ActionContent({ icon, label, mobileIconOnly }) {
  return (
    <>
      {icon ? <FontAwesomeIcon icon={icon} /> : null}
      {label ? <span className={mobileIconOnly ? "hidden sm:inline" : ""}>{label}</span> : null}
    </>
  );
}

export default function ActionButton({
  icon,
  label,
  tone = "secondary",
  to,
  href,
  onClick,
  type = "button",
  disabled = false,
  mobileIconOnly = true,
  fullWidth = false,
  className,
  ...rest
}) {
  const resolvedClassName = getActionClassName({ tone, mobileIconOnly, fullWidth, className });

  if (to) {
    return (
      <Link to={to} className={resolvedClassName} title={label} aria-label={label} {...rest}>
        <ActionContent icon={icon} label={label} mobileIconOnly={mobileIconOnly} />
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={resolvedClassName} title={label} aria-label={label} {...rest}>
        <ActionContent icon={icon} label={label} mobileIconOnly={mobileIconOnly} />
      </a>
    );
  }

  return (
    <button
      type={type}
      className={resolvedClassName}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      {...rest}
    >
      <ActionContent icon={icon} label={label} mobileIconOnly={mobileIconOnly} />
    </button>
  );
}

export function InlineActionButton({
  icon,
  label,
  tone = "secondary",
  to,
  onClick,
  type = "button",
  disabled = false,
  className,
}) {
  const toneClassName =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100"
        : tone === "primary"
          ? "border-brand-200 bg-brand-50 text-brand-700 hover:border-brand-300 hover:bg-brand-100"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100";

  const resolvedClassName = cn(
    "inline-flex min-h-[38px] items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    toneClassName,
    className,
  );

  if (to) {
    return (
      <Link to={to} className={resolvedClassName}>
        {icon ? <FontAwesomeIcon icon={icon} /> : null}
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button type={type} className={resolvedClassName} onClick={onClick} disabled={disabled}>
      {icon ? <FontAwesomeIcon icon={icon} /> : null}
      <span>{label}</span>
    </button>
  );
}
