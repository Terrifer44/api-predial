import CardDemanda from './CardDemanda';

export default function ListaDemandas({ demandas = [] }) {
  if (!demandas || demandas.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-message">Nenhuma demanda encontrada até o momento.</p>
      </div>
    );
  }

  return (
    <div className="grid-cards">
      {demandas.map((demanda) => (
        <CardDemanda key={demanda.id} demanda={demanda} />
      ))}
    </div>
  );
}