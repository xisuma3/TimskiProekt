using HrApp.DomainEntities.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using HrApp.DomainEntities.Identity; // Add this using statement
                                     // Add this using statement for ApplicationUser (created in previous step)

namespace HrAppWebApplication
{
    // IMPORTANT CHANGE: Inherit from IdentityDbContext<ApplicationUser>
    public class HrAppDbContext : IdentityDbContext<ApplicationUser>
    {
        public HrAppDbContext(DbContextOptions<HrAppDbContext> options)
            : base(options)
        {
        }

        // --- Existing DbSets (keep these as they are) ---
        public DbSet<Department> Departments { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<EmployeeDossier> EmployeeDossiers { get; set; }
        public DbSet<LeaveRequest> LeaveRequests { get; set; }
        public DbSet<LeaveEntitlement> LeaveEntitlements { get; set; }
        public DbSet<Asset> Assets { get; set; }
        public DbSet<AssetAssignment> AssetAssignments { get; set; }
        public DbSet<DocumentTemplate> DocumentTemplates { get; set; }
        public DbSet<GeneratedDocument> GeneratedDocuments { get; set; }

        // --- REMOVE THE OLD DbSet<User>! ---
        // public DbSet<User> Users { get; set; } // <--- DELETE THIS LINE

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // --- CRUCIAL: Call the base method FIRST! ---
            // This configures all the AspNet* Identity tables.
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Employee>()
               .HasOne(e => e.ApplicationUser)
               .WithOne(u => u.Employee)
               .HasForeignKey<Employee>(e => e.ApplicationUserId);

            // --- REMOVE THE OLD User configuration block! ---
            // modelBuilder.Entity<User>(entity =>
            // {
            //     entity.HasKey(u => u.Id);
            //     entity.Property(u => u.Email).IsRequired().HasMaxLength(255);
            //     entity.HasIndex(u => u.Email).IsUnique();
            //     entity.Property(u => u.PasswordHash).IsRequired();
            //     entity.Property(u => u.CreatedAt).HasDefaultValueSql("GETDATE()");
            //     entity.HasOne(u => u.Employee)
            //         .WithOne()
            //         .HasForeignKey<User>(u => u.EmployeeID)
            //         .OnDelete(DeleteBehavior.Cascade);
            //     entity.HasIndex(u => u.EmployeeID).IsUnique();
            // }); // <--- DELETE THIS ENTIRE BLOCK

            // --- Your existing OnModelCreating configurations (keep these as they are) ---
            // Department configuration
            modelBuilder.Entity<Department>(entity =>
            {
                entity.HasKey(d => d.DepartmentID);
                entity.Property(d => d.Name).IsRequired().HasMaxLength(100);
                entity.Property(d => d.Description).HasMaxLength(500);
            });

            // Employee configuration
            modelBuilder.Entity<Employee>(entity =>
            {
                entity.HasKey(e => e.EmployeeID);
                entity.Property(e => e.FirstName).HasMaxLength(50);
                entity.Property(e => e.LastName).HasMaxLength(50);
                entity.Property(e => e.Email).HasMaxLength(255);
                // Filtered, so a retired employee does not permanently reserve their
                // email address against a re-hire or a new joiner.
                entity.HasIndex(e => e.Email).IsUnique().HasFilter("[IsDeleted] = 0");
             
                entity.Property(e => e.HireDate);
                entity.Property(e => e.Position).HasMaxLength(100);

                entity.HasOne(e => e.Department)
                    .WithMany(d => d.Employees)
                    .HasForeignKey(e => e.DepartmentID)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Manager)
                    .WithMany(m => m.Subordinates)
                    .HasForeignKey(e => e.ManagerID)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Mentor)
                    .WithMany(m => m.Mentees)
                    .HasForeignKey(e => e.MentorID)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.Property(e => e.IsDeleted).HasDefaultValue(false);
                entity.HasIndex(e => e.IsDeleted);
            });

            // EmployeeDossier configuration
            modelBuilder.Entity<EmployeeDossier>(entity =>
            {
                entity.HasKey(d => d.DossierID);

                entity.HasOne(d => d.Employee)
                    .WithOne(e => e.EmployeeDossier)
                    .HasForeignKey<EmployeeDossier>(d => d.EmployeeID)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(d => d.BirthDate).IsRequired(false);
                entity.Property(d => d.Address).HasMaxLength(255);
                entity.Property(d => d.EmergencyContact).HasMaxLength(100);

                entity.Property(d => d.EmploymentType)
                    .HasMaxLength(50)
                    .HasConversion<string>();
            });

            // LeaveRequest configuration
            modelBuilder.Entity<LeaveRequest>(entity =>
            {
                entity.HasKey(l => l.RequestID);

                entity.HasOne(l => l.Employee)
                    .WithMany(e => e.LeaveRequests)
                    .HasForeignKey(l => l.EmployeeID)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.Property(l => l.StartDate).IsRequired();
                entity.Property(l => l.EndDate).IsRequired();

                entity.Property(l => l.LeaveType)
                    .HasMaxLength(50)
                    .HasConversion<string>();

                entity.Property(l => l.Status)
                    .HasMaxLength(20)
                    .HasDefaultValue("Pending")
                    .HasConversion<string>();

                entity.Property(l => l.CreatedAt)
                    .HasDefaultValueSql("GETDATE()");

                entity.Property(l => l.DecisionReason).HasMaxLength(500);

                // Restrict, not Cascade: deleting an approver must not erase the leave
                // records they decided on. Employee already cascades to LeaveRequests via
                // the EmployeeID relationship, so a second cascade path here would also be
                // rejected by SQL Server.
                entity.HasOne(l => l.ApprovedBy)
                    .WithMany()
                    .HasForeignKey(l => l.ApprovedByEmployeeID)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // LeaveEntitlement configuration
            modelBuilder.Entity<LeaveEntitlement>(entity =>
            {
                entity.HasKey(l => l.EntitlementID);

                // Restrict: an allowance is part of the employment record.
                entity.HasOne(l => l.Employee)
                    .WithMany()
                    .HasForeignKey(l => l.EmployeeID)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.Property(l => l.LeaveType).IsRequired().HasMaxLength(50);
                entity.Property(l => l.DaysAllocated).HasColumnType("decimal(5,2)");
                entity.Property(l => l.DaysCarriedOver).HasColumnType("decimal(5,2)");

                entity.Ignore(l => l.TotalAvailable);

                // One allowance per employee per year per type.
                entity.HasIndex(l => new { l.EmployeeID, l.Year, l.LeaveType }).IsUnique();
            });

            // Asset configuration
            modelBuilder.Entity<Asset>(entity =>
            {
                entity.HasKey(a => a.AssetID);

                entity.HasOne(a => a.Employee)
                    .WithMany(e => e.Assets)
                    .HasForeignKey(a => a.EmployeeID)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.Property(a => a.Name).IsRequired().HasMaxLength(100);
                entity.Property(a => a.Description).HasMaxLength(500);
                entity.Property(a => a.SerialNumber).HasMaxLength(100);
                // Filtered: SQL Server allows only one NULL in a plain unique index, which
                // would cap the estate at a single asset with no serial number.
                entity.HasIndex(a => a.SerialNumber).IsUnique().HasFilter("[SerialNumber] IS NOT NULL");

                entity.Property(a => a.IsActive).HasDefaultValue(true);
            });

            // AssetAssignment configuration — the custody chain
            modelBuilder.Entity<AssetAssignment>(entity =>
            {
                entity.HasKey(a => a.AssignmentID);

                entity.HasOne(a => a.Asset)
                    .WithMany(a => a.Assignments)
                    .HasForeignKey(a => a.AssetID)
                    .OnDelete(DeleteBehavior.Cascade);

                // Restrict: retiring an employee must not erase the record that they
                // once held company equipment.
                entity.HasOne(a => a.Employee)
                    .WithMany()
                    .HasForeignKey(a => a.EmployeeID)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.Property(a => a.AssignedDate).HasDefaultValueSql("GETDATE()");
                entity.Property(a => a.Notes).HasMaxLength(500);
                entity.Property(a => a.ReturnCondition).HasMaxLength(200);

                entity.Ignore(a => a.IsOpen);

                // Finding the current holder, and an employee's held assets, are the two
                // hot paths.
                entity.HasIndex(a => new { a.AssetID, a.ReturnedDate });
                entity.HasIndex(a => new { a.EmployeeID, a.ReturnedDate });
            });

            // DocumentTemplate configuration
            modelBuilder.Entity<DocumentTemplate>(entity =>
            {
                entity.HasKey(t => t.TemplateID);

                entity.Property(t => t.TemplateName).IsRequired().HasMaxLength(100);
                entity.Property(t => t.Description).HasMaxLength(500);
                entity.Property(t => t.TemplateContent).IsRequired();

                entity.Property(t => t.TemplateType)
                    .IsRequired()
                    .HasMaxLength(50);
            });

            // GeneratedDocument configuration
            modelBuilder.Entity<GeneratedDocument>(entity =>
            {
                entity.HasKey(g => g.DocumentID);

                entity.HasOne(g => g.Employee)
                    .WithMany(e => e.GeneratedDocuments)
                    .HasForeignKey(g => g.EmployeeID)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(g => g.DocumentTemplate)
                    .WithMany(t => t.GeneratedDocuments)
                    .HasForeignKey(g => g.TemplateID)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(g => g.Content).IsRequired();
                entity.Property(g => g.GeneratedDate).HasDefaultValueSql("GETDATE()");
                entity.Property(g => g.AssetIDs).HasColumnType("NVARCHAR(MAX)").IsRequired(false);
            });
        }
    }
}