import { TypeSafeEmitter } from '../src';

// Define form event types
interface FormEvents {
  fieldChange: {
    fieldName: string;
    value: string;
    isValid: boolean;
    errors: string[];
  };
  formSubmit: {
    formData: Record<string, string>;
    isValid: boolean;
    errors: Record<string, string[]>;
  };
  validationStart: {
    fieldName: string;
    value: string;
  };
  validationComplete: {
    fieldName: string;
    isValid: boolean;
    errors: string[];
  };
  formReset: {
    timestamp: number;
  };
}

class FormValidator {
  private events = new TypeSafeEmitter<FormEvents>();
  private formData: Record<string, string> = {};
  private fieldErrors: Record<string, string[]> = {};

  constructor() {
    // Listen for field changes
    this.events.on('fieldChange', ({ fieldName, value, isValid, errors }) => {
      this.formData[fieldName] = value;
      this.fieldErrors[fieldName] = errors;
      
      console.log(`Field '${fieldName}' changed:`, {
        value,
        isValid,
        errors: errors.length ? errors : 'none'
      });
    });

    // Listen for form submissions
    this.events.on('formSubmit', ({ formData, isValid, errors }) => {
      if (isValid) {
        console.log('Form submitted successfully:', formData);
      } else {
        console.log('Form submission failed:', errors);
      }
    });

    // Track validation progress
    this.events.on('validationStart', ({ fieldName }) => {
      console.log(`Starting validation for ${fieldName}...`);
    });

    this.events.on('validationComplete', ({ fieldName, isValid }) => {
      console.log(`Validation ${isValid ? 'passed' : 'failed'} for ${fieldName}`);
    });

    // Handle form reset
    this.events.on('formReset', () => {
      this.formData = {};
      this.fieldErrors = {};
      console.log('Form has been reset');
    });
  }

  private validateEmail(email: string): string[] {
    const errors: string[] = [];
    if (!email) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email format');
    }
    return errors;
  }

  private validatePassword(password: string): string[] {
    const errors: string[] = [];
    if (!password) {
      errors.push('Password is required');
    } else {
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
      }
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain an uppercase letter');
      }
      if (!/[0-9]/.test(password)) {
        errors.push('Password must contain a number');
      }
    }
    return errors;
  }

  simulateFormInteraction() {
    // Simulate email field interaction
    this.events.emit('validationStart', {
      fieldName: 'email',
      value: 'invalid-email'
    });

    this.events.emit('fieldChange', {
      fieldName: 'email',
      value: 'invalid-email',
      isValid: false,
      errors: ['Invalid email format']
    });

    this.events.emit('validationComplete', {
      fieldName: 'email',
      isValid: false,
      errors: ['Invalid email format']
    });

    // Simulate correcting the email
    setTimeout(() => {
      this.events.emit('validationStart', {
        fieldName: 'email',
        value: 'user@example.com'
      });

      this.events.emit('fieldChange', {
        fieldName: 'email',
        value: 'user@example.com',
        isValid: true,
        errors: []
      });

      this.events.emit('validationComplete', {
        fieldName: 'email',
        isValid: true,
        errors: []
      });
    }, 1000);

    // Simulate password field interaction
    setTimeout(() => {
      this.events.emit('validationStart', {
        fieldName: 'password',
        value: 'weak'
      });

      this.events.emit('fieldChange', {
        fieldName: 'password',
        value: 'weak',
        isValid: false,
        errors: [
          'Password must be at least 8 characters',
          'Password must contain an uppercase letter',
          'Password must contain a number'
        ]
      });

      this.events.emit('validationComplete', {
        fieldName: 'password',
        isValid: false,
        errors: [
          'Password must be at least 8 characters',
          'Password must contain an uppercase letter',
          'Password must contain a number'
        ]
      });
    }, 2000);

    // Simulate form submission with errors
    setTimeout(() => {
      this.events.emit('formSubmit', {
        formData: this.formData,
        isValid: false,
        errors: this.fieldErrors
      });
    }, 3000);

    // Simulate fixing password and resubmitting
    setTimeout(() => {
      this.events.emit('validationStart', {
        fieldName: 'password',
        value: 'StrongPass123'
      });

      this.events.emit('fieldChange', {
        fieldName: 'password',
        value: 'StrongPass123',
        isValid: true,
        errors: []
      });

      this.events.emit('validationComplete', {
        fieldName: 'password',
        isValid: true,
        errors: []
      });

      // Successful form submission
      this.events.emit('formSubmit', {
        formData: {
          ...this.formData,
          password: 'StrongPass123'
        },
        isValid: true,
        errors: {}
      });
    }, 4000);

    // Reset the form
    setTimeout(() => {
      this.events.emit('formReset', {
        timestamp: Date.now()
      });
    }, 5000);
  }
}

// Example usage
console.log('Starting form validation simulation...\n');
const form = new FormValidator().simulateFormInteraction(); 