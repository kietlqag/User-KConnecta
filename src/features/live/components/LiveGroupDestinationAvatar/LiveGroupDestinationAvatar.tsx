interface LiveGroupDestinationAvatarProps {
  name: string;
  coverPhotoUrl?: string | null;
}

export function LiveGroupDestinationAvatar({ name, coverPhotoUrl }: LiveGroupDestinationAvatarProps) {
  if (coverPhotoUrl) {
    return (
      <img
        src={coverPhotoUrl}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-lg border border-gray-100 object-cover dark:border-gray-700"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
