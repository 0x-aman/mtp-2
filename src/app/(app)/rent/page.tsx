import Link from "next/link";
import { Boxes, Clock, IndianRupee, Plus } from "lucide-react";

import { DatabaseBanner } from "@/components/database-banner";
import { PageHeader } from "@/components/page-header";
import { RentManager } from "@/components/rent-manager";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { getRentalDataset } from "@/lib/rental-data";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default async function RentPage() {
  const dataset = await getRentalDataset();

  return (
    <>
      <PageHeader
        title="Rent"
        description="Machine availability, deposits, daily rent, and returns."
        actions={
          <>
            <Button asChild>
              <Link href="/products/new">
                <Plus />
                New Machine
              </Link>
            </Button>
          </>
        }
      />
      <DatabaseBanner ready={dataset.databaseReady} error={dataset.error} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Machines" value={formatNumber(dataset.metrics.machineCount)} icon={Boxes} tone="blue" />
        <StatCard
          title="Available"
          value={formatNumber(dataset.metrics.availableMachines)}
          icon={Boxes}
          tone={dataset.metrics.availableMachines ? "green" : "red"}
        />
        <StatCard title="Open Rent" value={formatNumber(dataset.metrics.openRentals)} icon={Clock} tone="orange" />
        <StatCard
          title="Deposits Held"
          value={formatCurrency(dataset.metrics.depositsHeld)}
          icon={IndianRupee}
          tone="green"
        />
      </div>

      <RentManager machines={dataset.machines} rentals={dataset.rentals} />
    </>
  );
}
