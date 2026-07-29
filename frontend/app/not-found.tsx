import Link from "next/link";
import { ErrorState } from "@/components/states/ErrorState";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto text-center">
      <ErrorState
        title="Page not found"
        message="The page you're looking for doesn't exist or may have been moved."
      />
      <div className="mt-6">
        <ButtonLink href="/">Back to Home</ButtonLink>
      </div>
      <p className="mt-4 text-xs text-t3">
        Or try the{" "}
        <Link href="/bounties" className="underline decoration-wist/40 underline-offset-4 hover:text-wist">
          bounty explorer
        </Link>
        .
      </p>
    </div>
  );
}
