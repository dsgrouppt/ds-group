import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmButton";
import { CAMPAIGN_CHANNEL_LABEL } from "@/lib/enums";
import { updateCampaign, deleteCampaign } from "../actions";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const user = await requireModuleAccess("marketing");
  const canEdit = can(user.role, "marketing", "edit");

  const campaign = await prisma.marketingCampaign.findUnique({ where: { id: params.id } });
  if (!campaign) notFound();

  return (
    <div>
      <PageHeader title={campaign.name} description={CAMPAIGN_CHANNEL_LABEL[campaign.channel as keyof typeof CAMPAIGN_CHANNEL_LABEL]} />

      <Card className="max-w-[560px]">
        <CardBody>
          <form action={updateCampaign.bind(null, campaign.id)} className="flex flex-col gap-4">
            <FieldGroup label="Nome" htmlFor="name">
              <Input id="name" name="name" defaultValue={campaign.name} required disabled={!canEdit} />
            </FieldGroup>
            <FieldGroup label="Canal" htmlFor="channel">
              <Select id="channel" name="channel" defaultValue={campaign.channel} disabled={!canEdit}>
                {Object.entries(CAMPAIGN_CHANNEL_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Orçamento (€)" htmlFor="budget">
              <Input id="budget" name="budget" type="number" min="0" step="10" defaultValue={campaign.budget ?? ""} disabled={!canEdit} />
            </FieldGroup>
            <FieldGroup label="Início" htmlFor="startDate">
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={campaign.startDate ? campaign.startDate.toISOString().slice(0, 10) : ""}
                disabled={!canEdit}
              />
            </FieldGroup>
            <FieldGroup label="Fim" htmlFor="endDate">
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={campaign.endDate ? campaign.endDate.toISOString().slice(0, 10) : ""}
                disabled={!canEdit}
              />
            </FieldGroup>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={campaign.active} disabled={!canEdit} />
              Campanha ativa
            </label>
            <FieldGroup label="Notas" htmlFor="notes">
              <Textarea id="notes" name="notes" rows={2} defaultValue={campaign.notes ?? ""} disabled={!canEdit} />
            </FieldGroup>
            {canEdit && <SubmitButton>Guardar Alterações</SubmitButton>}
          </form>

          {canEdit && (
            <form action={deleteCampaign.bind(null, campaign.id)} className="mt-4 pt-4 border-t border-mist-2">
              <ConfirmSubmitButton confirmMessage={`Apagar a campanha "${campaign.name}"?`}>Apagar Campanha</ConfirmSubmitButton>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
