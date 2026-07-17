import { MachineForm } from "@/components/machine-form";
import { PageHeader } from "@/components/page-header";
import { getNextMachineSku } from "@/lib/inventory-data";
import { getMachineFormOptions } from "@/lib/rental-data";

export default async function NewMachinePage() {
  const [nextSku, formOptions] = await Promise.all([getNextMachineSku(), getMachineFormOptions()]);

  return (
    <>
      <PageHeader title="New Machine" description="Add a rentable machine and default rent values." />
      <MachineForm defaultSku={nextSku} brands={formOptions.brands} categories={formOptions.categories} />
    </>
  );
}
