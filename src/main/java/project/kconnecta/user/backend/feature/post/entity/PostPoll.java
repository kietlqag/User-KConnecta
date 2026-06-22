package project.kconnecta.user.backend.feature.post.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "post_polls", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostPoll {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false, unique = true)
    private Post post;

    @Column(name = "allow_multiple", nullable = false)
    private boolean allowMultiple;

    @Column(name = "allow_add_options", nullable = false)
    private boolean allowAddOptions;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @BatchSize(size = 20)
    @OrderBy("sortOrder ASC")
    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PostPollOption> options = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
