import { PageHead, Empty } from '../components/ui'

export function Placeholder({ title, icon, step }: { title: string; icon: string; step: string }) {
  return (
    <>
      <PageHead title={title} />
      <div className="card">
        <Empty icon={icon} title="Bientôt ici">
          Cette partie arrive à l'{step} du plan.
        </Empty>
      </div>
    </>
  )
}
