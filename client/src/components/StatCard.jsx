const StatCard = ({ title, value, icon: Icon, color, subtitle }) => {
  return (
    <div className="stat-card">
      <div className="stat-heading">
        <span>{title}</span>
        <Icon size={21} style={{ color }} />
      </div>

      <h2>{value}</h2>

      <small>{subtitle}</small>
    </div>
  );
};

export default StatCard;