package project.kconnecta.user.backend.feature.policy.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import project.kconnecta.user.backend.feature.policy.entity.enums.KeywordCategory;

import java.time.LocalDateTime;

@Entity
@Table(name = "policy_keywords")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PolicyKeyword {

    @Id
    @Column(length = 64, nullable = false, updatable = false)
    private String id;

    @Column(nullable = false, length = 255)
    private String value;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private KeywordCategory category;

    @Column(name = "keyword_group", length = 100)
    private String keywordGroup;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
