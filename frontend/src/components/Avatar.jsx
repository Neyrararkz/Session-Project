export default function Avatar({ src, alt, size = '40px' }) {
  const defaultAvatar = 'http://localhost:8080/uploads/default-avatar.png';
  const imageSrc = src || defaultAvatar;

  return (
    <img
      src={imageSrc}
      alt={alt || 'User'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        backgroundColor: 'var(--bg-gray)',
        flexShrink: 0
      }}
      onError={(e) => {
        e.target.src = defaultAvatar;
      }}
    />
  );
}