import { team } from "@/lib/site-data";
import { Reveal } from "@/components/ui/Reveal";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";

export function Team() {
  return (
    <section className="py-36 bg-white" id="equipa">
      <div className="container">
        <Reveal className="max-w-[50ch] mb-20">
          <div className="eyebrow">Equipa</div>
          <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-tight">
            As pessoas que respondem pelo seu projeto.
          </h2>
        </Reveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-7">
          {team.map((member, i) => (
            <Reveal key={member.role} index={i} delayStep={0.08}>
              <div className="relative aspect-[4/5] mb-5">
                <PlaceholderMedia
                  variant="light"
                  src={member.image}
                  label="Fotografia real"
                  className="absolute inset-0"
                />
              </div>
              <h4 className="font-display font-medium text-[1.1rem]">
                {member.name ?? "[Nome]"}
              </h4>
              <span className="text-[.78rem] text-gold tracking-wide">{member.role}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
