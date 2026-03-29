import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const NotFound = () => {
  return (
    <div className="mx-auto max-w-md px-4 py-32 text-center">
      <p className="text-6xl font-bold text-surface-700 mb-4">404</p>
      <h1 className="text-xl font-semibold mb-2">Page not found</h1>
      <p className="text-sm text-surface-400 mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <Button variant="secondary" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Button>
      </Link>
    </div>
  );
};
