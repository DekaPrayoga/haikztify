import usePlayerStore from '../store/playerStore';

export default function CardGrid({ title, items, onCardClick }) {
  const { playTrack } = usePlayerStore();

  return (
    <section className="home-section">
      <div className="section-heading-wrap">
        <h2 className="section-heading">{title}</h2>
      </div>
      <div className="card-row">
        {items.map((item, i) => (
          <div
            key={item.id || i}
            className="card"
            onClick={() => {
              if (onCardClick) onCardClick(item);
              else if (item.src) playTrack(item);
            }}
          >
            <div className="card-img-wrap">
              <img src={item.cover} alt="" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
              <div className="card-play-btn">
                <svg viewBox="0 0 24 24" fill="black"><path d="M8 5.14v14l11-7-11-7z"/></svg>
              </div>
            </div>
            <div className="card-title">{item.title}</div>
            <div className="card-sub">{item.desc || item.artist}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
