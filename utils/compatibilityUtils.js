// utils/compatibilityUtils.js
/**
 * Backend compatibility checking utilities for PC components
 */

/**
 * Check if CPU and Motherboard are compatible
 */
function checkCPUMotherboardCompatibility(cpu, motherboard) {
   const issues = [];

   if (!cpu || !motherboard) {
      return { compatible: true, issues: [] };
   }

   const cpuSocket = cpu.specifications?.socket?.toLowerCase() || '';
   const mbSocket = motherboard.specifications?.socket?.toLowerCase() || '';

   if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
      issues.push(
         `Socket mismatch: CPU (${cpu.specifications.socket}) vs Motherboard (${motherboard.specifications.socket})`
      );
   }

   return {
      compatible: issues.length === 0,
      issues,
   };
}

/**
 * Check if RAM and Motherboard are compatible
 */
function checkRAMMotherboardCompatibility(ram, motherboard) {
   const issues = [];

   if (!ram || !motherboard) {
      return { compatible: true, issues: [] };
   }

   const ramType = ram.specifications?.type?.toLowerCase() || '';
   const mbMemoryType =
      motherboard.specifications?.memoryType?.toLowerCase() || '';

   if (ramType && mbMemoryType) {
      const ramGen = ramType.includes('ddr5')
         ? 'ddr5'
         : ramType.includes('ddr4')
         ? 'ddr4'
         : 'ddr3';
      const mbGen = mbMemoryType.includes('ddr5')
         ? 'ddr5'
         : mbMemoryType.includes('ddr4')
         ? 'ddr4'
         : 'ddr3';

      if (ramGen !== mbGen) {
         issues.push(
            `Memory type mismatch: RAM (${ramType}) vs Motherboard (${mbMemoryType})`
         );
      }
   }

   return {
      compatible: issues.length === 0,
      issues,
   };
}

/**
 * Check if PSU has enough wattage for the system
 */
function checkPSUWattage(parts) {
   const issues = [];
   const warnings = [];

   let estimatedWattage = 100; // Base system

   // CPU
   if (parts.CPU) {
      const cpuTDP =
         parseInt(parts.CPU.specifications?.TDP?.replace('W', '')) || 65;
      estimatedWattage += cpuTDP;
   }

   // GPU
   if (parts.GPU) {
      const gpuTDP =
         parseInt(parts.GPU.specifications?.TDP?.replace('W', '')) || 150;
      estimatedWattage += gpuTDP;
   }

   // RAM (rough estimate)
   if (parts.RAM) {
      estimatedWattage += 30;
   }

   // Storage
   if (parts.Storage) {
      const isSSD = parts.Storage.specifications?.type
         ?.toLowerCase()
         .includes('ssd');
      estimatedWattage += isSSD ? 10 : 20;
   }

   // Add 20% headroom
   const recommendedWattage = Math.ceil(estimatedWattage * 1.2);

   // Check PSU
   const psuWattage = parts.PSU
      ? parseInt(parts.PSU.specifications?.wattage?.replace('W', '')) || 500
      : 500;

   if (psuWattage < estimatedWattage) {
      issues.push(
         `PSU wattage too low: ${psuWattage}W (need at least ${estimatedWattage}W)`
      );
   } else if (psuWattage < recommendedWattage) {
      warnings.push(
         `PSU wattage adequate but tight: ${psuWattage}W (recommended ${recommendedWattage}W)`
      );
   }

   return {
      compatible: issues.length === 0,
      issues,
      warnings,
      totalWattage: estimatedWattage,
      psuWattage,
      recommendedWattage,
   };
}

/**
 * Check if GPU fits in the case
 */
function checkGPUCaseCompatibility(gpu, pcCase) {
   const issues = [];

   if (!gpu || !pcCase) {
      return { compatible: true, issues: [] };
   }

   const gpuLength =
      parseInt(gpu.specifications?.length?.replace('mm', '')) || 280;
   const maxGPULength =
      parseInt(pcCase.specifications?.maxGPULength?.replace('mm', '')) || 320;

   if (gpuLength > maxGPULength) {
      issues.push(
         `GPU too long: ${gpuLength}mm (case supports up to ${maxGPULength}mm)`
      );
   }

   return {
      compatible: issues.length === 0,
      issues,
   };
}

/**
 * Check overall bundle compatibility
 */
export function checkCompatibility(parts) {
   const report = {
      compatible: true,
      issues: [],
      warnings: [],
      checks: {},
   };

   // CPU-Motherboard compatibility
   const cpuMBCheck = checkCPUMotherboardCompatibility(
      parts.CPU,
      parts.Motherboard
   );
   report.checks.cpuMotherboard = cpuMBCheck;
   if (!cpuMBCheck.compatible) {
      report.compatible = false;
      report.issues.push(...cpuMBCheck.issues);
   }

   // RAM-Motherboard compatibility
   const ramMBCheck = checkRAMMotherboardCompatibility(
      parts.RAM,
      parts.Motherboard
   );
   report.checks.ramMotherboard = ramMBCheck;
   if (!ramMBCheck.compatible) {
      report.compatible = false;
      report.issues.push(...ramMBCheck.issues);
   }

   // PSU wattage check
   const psuCheck = checkPSUWattage(parts);
   report.checks.psuWattage = psuCheck;
   if (!psuCheck.compatible) {
      report.compatible = false;
      report.issues.push(...psuCheck.issues);
   }
   if (psuCheck.warnings?.length > 0) {
      report.warnings.push(...psuCheck.warnings);
   }

   // GPU-Case compatibility
   const gpuCaseCheck = checkGPUCaseCompatibility(parts.GPU, parts.Case);
   report.checks.gpuCase = gpuCaseCheck;
   if (!gpuCaseCheck.compatible) {
      report.compatible = false;
      report.issues.push(...gpuCaseCheck.issues);
   }

   // Calculate compatibility score (0-100)
   const totalChecks = Object.keys(report.checks).length;
   const passedChecks = Object.values(report.checks).filter(
      (c) => c.compatible
   ).length;
   report.score =
      totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

   return report;
}

export default {
   checkCompatibility,
   checkCPUMotherboardCompatibility,
   checkRAMMotherboardCompatibility,
   checkPSUWattage,
   checkGPUCaseCompatibility,
};
