package project.kconnecta.user.backend.feature.album.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.exception.ForbiddenException;
import project.kconnecta.user.backend.feature.album.entity.Album;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumPrivacy;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumStatus;
import project.kconnecta.user.backend.feature.album.service.AlbumPermissionService;
import project.kconnecta.user.backend.feature.friend.entity.Friendship;
import project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus;
import project.kconnecta.user.backend.feature.friend.repository.FriendshipRepository;
import project.kconnecta.user.backend.feature.group.entity.GroupMember;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberRole;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus;
import project.kconnecta.user.backend.feature.group.repository.GroupMemberRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AlbumPermissionServiceImpl implements AlbumPermissionService {

    private final FriendshipRepository friendshipRepository;
    private final GroupMemberRepository groupMemberRepository;

    @Override
    public boolean canView(UUID viewerId, Album album) {
        if (album.getStatus() == AlbumStatus.DELETED) {
            return false;
        }
        if (viewerId != null && album.getOwner().getId().equals(viewerId)) {
            return true;
        }
        if (album.getGroup() != null) {
            if (viewerId == null) {
                return false;
            }
            return groupMemberRepository.findByGroupIdAndUserId(album.getGroup().getId(), viewerId)
                    .map(m -> m.getStatus() == GroupMemberStatus.APPROVED)
                    .orElse(false);
        }
        return switch (album.getPrivacy()) {
            case PUBLIC -> true;
            case FRIENDS -> viewerId != null && areFriends(viewerId, album.getOwner().getId());
            case ONLY_ME -> false;
        };
    }

    @Override
    public boolean canEdit(UUID userId, Album album) {
        if (album.getStatus() == AlbumStatus.DELETED) {
            return false;
        }
        if (album.getOwner().getId().equals(userId)) {
            return true;
        }
        if (album.getGroup() != null) {
            return groupMemberRepository.findByGroupIdAndUserId(album.getGroup().getId(), userId)
                    .map(m -> m.getStatus() == GroupMemberStatus.APPROVED
                            && m.getRole() == GroupMemberRole.ADMIN)
                    .orElse(false);
        }
        return false;
    }

    @Override
    public void requireView(UUID viewerId, Album album) {
        if (!canView(viewerId, album)) {
            throw new ForbiddenException("You do not have permission to view this album");
        }
    }

    @Override
    public void requireEdit(UUID userId, Album album) {
        if (!canEdit(userId, album)) {
            throw new ForbiddenException("You do not have permission to edit this album");
        }
    }

    private boolean areFriends(UUID u1, UUID u2) {
        return friendshipRepository.findBetweenUsers(u1, u2)
                .map(Friendship::getStatus)
                .filter(s -> s == FriendshipStatus.ACCEPTED)
                .isPresent();
    }
}
