import { Link } from 'react-router-dom';
import { useFocus } from '../../context/FocusContext';
import { Card } from '../ui/Primitives';
import FocusHistoryList from '../focus/FocusHistoryList';

export default function FocusHistoryCard() {
  const { history } = useFocus();
  const preview = history.slice(0, 4);

  return (
    <Card className="grain p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="card-title">Historico de sessoes</h3>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-smoke">
            Cada vez que voce encerra um foco, a sessao entra aqui — tarefa, duracao e blocos concluidos.
          </p>
        </div>
        <Link to="/focus" className="btn-ghost shrink-0 !px-3 !py-1.5 text-[12px]">
          Ver todos
        </Link>
      </div>
      <div className="mt-4">
        <FocusHistoryList entries={preview} empty="Nenhuma sessao ainda. Dê play num card para comecar." />
      </div>
    </Card>
  );
}
