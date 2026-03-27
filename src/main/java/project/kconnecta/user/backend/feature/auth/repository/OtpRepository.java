package project.kconnecta.user.backend.feature.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.common.enums.OtpType;
import project.kconnecta.user.backend.feature.auth.entity.Otp;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OtpRepository extends JpaRepository<Otp, UUID> {
    Optional<Otp> findTopByAccountEmailAndTypeOrderByCreatedAtDesc(String email, OtpType type);
    void deleteByAccountEmailAndType(String email, OtpType type);
    void deleteByAccountEmail(String email);
}
