import { clsx } from "../../utils/clsx";

export function Table({ children, className = "" }) {
  return (
    <div className="w-full overflow-x-auto rounded border border-grey-200">
      <table className={clsx("w-full text-sm text-left", className)}>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead className="bg-grey-50 border-b border-grey-200">
      {children}
    </thead>
  );
}

export function Th({ children, className = "" }) {
  return (
    <th className={clsx("px-4 py-3 font-medium text-grey-600 text-xs uppercase tracking-wide whitespace-nowrap", className)}>
      {children}
    </th>
  );
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-grey-100">{children}</tbody>;
}

export function Tr({ children, onClick, className = "" }) {
  return (
    <tr
      className={clsx(
        "bg-white transition-colors",
        onClick && "cursor-pointer hover:bg-grey-50",
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className = "" }) {
  return (
    <td className={clsx("px-4 py-3 text-grey-700 align-top", className)}>
      {children}
    </td>
  );
}
