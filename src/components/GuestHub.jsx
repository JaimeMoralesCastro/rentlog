import Guidebook from './Guidebook.jsx';
import Messaging from './Messaging.jsx';

// Página combinada del huésped: primero la guía digital (con su hero) y, a
// continuación, las plantillas de mensajería como sección embebida. Une lo que
// antes eran dos pestañas (Guía + Mensajes) en un solo flujo.
export default function GuestHub({ data }) {
  return (
    <>
      <Guidebook data={data} />
      <div className="page pb-16">
        <Messaging data={data} embedded />
      </div>
    </>
  );
}
