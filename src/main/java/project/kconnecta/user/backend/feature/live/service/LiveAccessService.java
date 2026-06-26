package project.kconnecta.user.backend.feature.live.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.exception.ForbiddenException;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus;
import project.kconnecta.user.backend.feature.group.repository.GroupMemberRepository;
import project.kconnecta.user.backend.feature.live.entity.LiveSession;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveSessionStatus;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.post.repository.PostRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LiveAccessService {

    private final PostRepository postRepository;
    private final GroupMemberRepository groupMemberRepository;

    public void requireAuthenticated(UUID userId) {
        if (userId == null) {
            throw new ForbiddenException("Authentication required");
        }
    }

    public void requireHost(LiveSession session, UUID userId) {
        requireAuthenticated(userId);
        if (!session.getHost().getId().equals(userId)) {
            throw new ForbiddenException("Only the host can perform this action");
        }
    }

    public boolean canView(LiveSession session, UUID viewerUserId) {
        if (viewerUserId != null && session.getHost().getId().equals(viewerUserId)) {
            return true;
        }
        if (session.getGroupId() != null && viewerUserId != null && isApprovedGroupMember(session.getGroupId(), viewerUserId)) {
            return true;
        }
        UUID linkedGroupId = resolveLinkedGroupId(session);
        if (linkedGroupId != null && viewerUserId != null && isApprovedGroupMember(linkedGroupId, viewerUserId)) {
            return true;
        }
        if (session.getStatus() == LiveSessionStatus.ENDED || session.getStatus() == LiveSessionStatus.CANCELED) {
            return canViewEndedSession(session, viewerUserId);
        }
        if (session.getPostId() != null) {
            if (viewerUserId == null) {
                return false;
            }
            return postRepository.isVisibleToUser(session.getPostId(), viewerUserId);
        }
        return session.getPrivacy() == PostPrivacy.PUBLIC;
    }

    public void requireCanView(LiveSession session, UUID viewerUserId) {
        if (!canView(session, viewerUserId)) {
            throw new ForbiddenException("You do not have permission to view this live session");
        }
    }

    private boolean canViewEndedSession(LiveSession session, UUID viewerUserId) {
        if (session.getPostId() != null) {
            if (viewerUserId == null) {
                return false;
            }
            return postRepository.isVisibleToUser(session.getPostId(), viewerUserId);
        }
        return session.getPrivacy() == PostPrivacy.PUBLIC;
    }

    private boolean isApprovedGroupMember(UUID groupId, UUID userId) {
        return groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .map(member -> member.getStatus() == GroupMemberStatus.APPROVED)
                .orElse(false);
    }

    private UUID resolveLinkedGroupId(LiveSession session) {
        if (session.getGroupId() != null) {
            return session.getGroupId();
        }
        if (session.getPostId() == null) {
            return null;
        }
        return postRepository.findById(session.getPostId())
                .map(Post::getGroup)
                .filter(group -> group != null)
                .map(group -> group.getId())
                .orElse(null);
    }
}
