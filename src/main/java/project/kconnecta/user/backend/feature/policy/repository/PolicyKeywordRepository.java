package project.kconnecta.user.backend.feature.policy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import project.kconnecta.user.backend.feature.policy.entity.PolicyKeyword;
import project.kconnecta.user.backend.feature.policy.entity.enums.KeywordCategory;

import java.util.List;

public interface PolicyKeywordRepository extends JpaRepository<PolicyKeyword, String> {

    List<PolicyKeyword> findAllByOrderByCategoryAscValueAsc();

    boolean existsByValueIgnoreCaseAndCategory(String value, KeywordCategory category);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM PolicyKeyword")
    void deleteAllKeywords();
}
