import { logoutAction } from "@/app/actions/auth";
import { PageHeader } from "@/components/page-header";
import { SettingsCards } from "@/components/settings-cards";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Single-owner security and environment readiness."
        actions={
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              Logout
            </Button>
          </form>
        }
      />

      <SettingsCards />
    </>
  );
}
