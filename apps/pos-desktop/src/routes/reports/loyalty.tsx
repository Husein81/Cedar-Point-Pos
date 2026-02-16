import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/reports/loyalty')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/reports/loyalty"!</div>
}
