import { MachineForm } from "@/components/machine-form";
import { PageHeader } from "@/components/page-header";
import { getNextMachineSku } from "@/lib/inventory-data";

export default async function NewMachinePage() {
  const nextSku = await getNextMachineSku();

  return (
    <>
      <PageHeader title="New Machine" description="Add a rentable machine and default rent values." />
      <MachineForm defaultSku={nextSku} />
    </>
  );
}
