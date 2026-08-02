import Link from "next/link";
import { cn } from "@/lib/utils";

interface LinkArrowProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function LinkArrow({ href, children, className }: LinkArrowProps) {
  return (
    <Link href={href} className={cn("link-arrow group", className)}>
      <span className="bar" />
      {children}
    </Link>
  );
}
