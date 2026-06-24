import { FriendCard } from '@/features/friends/components';
import type { Friend } from '@/features/friends/types/friends.types';
import { SearchResultPerson } from '../../types/search.types';

interface PeopleResultProps {
  person: SearchResultPerson;
  onFriendToggle: (id: string) => void;
}

export const PeopleResult = ({ person, onFriendToggle }: PeopleResultProps) => {
  const friend: Friend = {
    id: person.id,
    userId: person.id,
    name: person.name,
    avatar: person.avatar,
    mutualFriends: person.mutualFriends ?? 0,
    isFriend: person.isFriend,
  };

  return (
    <FriendCard
      friend={friend}
      onAddFriend={person.isFriend ? undefined : async (userId) => onFriendToggle(userId)}
      onUnfriend={person.isFriend ? async () => onFriendToggle(person.id) : undefined}
    />
  );
};
