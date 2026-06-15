package project.kconnecta.user.backend.feature.post.entity;

/** Moderation state of a comment. APPROVED is visible to everyone; PENDING/REJECTED are hidden from non-authors. */
public enum CommentStatus {
    APPROVED,
    PENDING,
    REJECTED
}
